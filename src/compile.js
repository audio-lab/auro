// compile source/ast/ir to WAST
import analyse, { err, desc } from "./analyse.js"
import stdlib from "./stdlib.js"
import {FLOAT,INT,RANGE,PTR,FUNC} from './const.js'
import { parse as parseWat } from "watr";

const F64_PER_PAGE = 8192;
const MEM_STRIDE = 8; // bytes per f64

export default function compile(node) {
  if (typeof node === 'string' || Array.isArray(node)) node = analyse(node)
  console.log('compile', node)

  let includes = [], // pieces to prepend
    globals = [], // global statements
    locals, // current local fn body
    memcount = 0, // current used memory pointer (number of f64s)
    scope, // current scope
    loop = 0 // current loop

  // processess global statements, returns nothing, only modifies globals, inits, out, memory
  function expr(statement, name) {
    if (!statement) return ''
    // a; - just declare in proper scope
    // FIXME: funcs may need returning something meaningful
    if (typeof statement === 'string') return scope[statement].type === FUNC ? `` : `(${scope[statement].global?'global':'local'}.get $${statement})`
    if (statement[0] in expr) return expr[statement[0]](statement, name) || ''
    err('Unknown operation `' + statement[0] + '`',statement)
  }

  Object.assign(expr, {
    // a; b; c;
    ';'([,...statements]){ let list=[]; for (let s of statements) list.push(expr(s)); return list.join('\n') },
    ','([,...statements]){ let list=[]; for (let s of statements) list.push(expr(s)); return list.join(' ') },

    // number primitives: 1.0, 2 etc.
    [FLOAT]([,a]) { return `(f64.const ${a})`},
    [INT]([,a]) { return `(i32.const ${a})`},

    '->'(fn, name) {
      let [,prepare,body] = fn, dfn = [], parent = scope, prevLocals = locals
      scope = fn.scope, locals = []

      // define init part - params, result
      if (fn.args) fn.args.forEach(id => {
        scope[id]._defined = true
        dfn.push(`(param $${id} ${scope[id].type == PTR ? 'i32' : 'f64'})`)
      })
      if (fn.result) dfn.push(`(result ${fn.result.type == FLOAT ? 'f64' : 'i32'})`)

      // declare locals
      Object.getOwnPropertyNames(scope).filter(id=>!scope[id].arg).forEach(define)

      const content = expr(prepare) + expr(body);

      // init body - expressions write themselves to body
      globals.push(
        `(func $${name} ${dfn.join(' ')}\n` +
        locals.join('\n') +
        content +
        `\n(return))`
      )

      scope = parent
      locals = prevLocals
    },

    '('(statement){
      let parent = scope
      scope = statement.scope
      // declare locals
      Object.getOwnPropertyNames(scope).forEach(define)
      let res = expr(statement[1])
      scope = parent
      return res
    },

    '()'([,name,[,...args]]){
      return `(call $${name} ${args.map(arg=>expr(arg)).join(' ')})`
    },

    '-'([,a,b]) {
      // [-, [int, a]] -> (i32.const -a)
      if (!b) {
        if (a[0] == INT || a[0] == FLOAT) return expr([a[0], -a[1]])
        if (desc(a,scope).type == FLOAT) return `(f64.neg ${expr(a)})`
        return expr(['-',[INT,0],a[1]])
      }
      if (desc(a,scope).type == INT && desc(b,scope).type == INT) return `(i32.sub ${expr(a)} ${expr(b)})`
      return `(f64.sub ${fexpr(a)} ${fexpr(b)})`
    },
    '+'([,a,b]) {
      if (desc(a,scope).type == INT && desc(b,scope).type == INT) return `(i32.add ${expr(a)} ${expr(b)})`
      return `(f64.add ${fexpr(a)} ${fexpr(b)})`
    },
    '*'([,a,b]) {
      if (desc(a,scope).type == INT && desc(b,scope).type == INT) return `(i32.mul ${expr(a)} ${expr(b)})`
      return `(f64.mul ${fexpr(a)} ${fexpr(b)})`
    },
    '++'([,a]) { return expr(['+=',a,[INT,1]]) },
    '--'([,a]) { return expr(['-=',a,[INT,1]]) },
    '+='([,a,b]) { return expr(['=',a,['+',a,b]]) },
    '-='([,a,b]) { return expr(['=',a,['-',a,b]]) },

    // comparisons
    '<'([,a,b]) {
      let aDesc = desc(a, scope), bDesc = desc(b, scope)
      if (aDesc.type === INT && bDesc.type === INT) return `(i32.lt_s ${expr(a)} ${expr(b)})`
      return `(f64.lt ${fexpr(a)} ${fexpr(b)})`
    },
    '<='([,a,b]) {
      let aDesc = desc(a, scope), bDesc = desc(b, scope)
      if (aDesc.type === INT && bDesc.type === INT) return `(i32.le_s ${expr(a)} ${expr(b)})`
      return `(f64.le ${fexpr(a)} ${fexpr(b)})`
    },
    '>'([,a,b]) {
      let aDesc = desc(a, scope), bDesc = desc(b, scope)
      if (aDesc.type === INT && bDesc.type === INT) return `(i32.gt_s ${expr(a)} ${expr(b)})`
      return `(f64.gt ${fexpr(a)} ${fexpr(b)})`
    },
    '>='([,a,b]) {
      let aDesc = desc(a, scope), bDesc = desc(b, scope)
      if (aDesc.type === INT && bDesc.type === INT) return `(i32.ge_s ${expr(a)} ${expr(b)})`
      return `(f64.ge ${fexpr(a)} ${fexpr(b)})`
    },
    '=='([,a,b]) {
      let aDesc = desc(a, scope), bDesc = desc(b, scope)
      if (aDesc.type === INT && bDesc.type === INT) return `(i32.eq_s ${expr(a)} ${expr(b)})`
      return `(f64.eq ${fexpr(a)} ${fexpr(b)})`
    },
    '!='([,a,b]) {
      let aDesc = desc(a, scope), bDesc = desc(b, scope)
      if (aDesc.type === INT && bDesc.type === INT) return `(i32.ne_s ${expr(a)} ${expr(b)})`
      return `(f64.ne ${fexpr(a)} ${fexpr(b)})`
    },

    // a -< range - clamp a to indicated range
    '-<'([,a,b]) {
      if (b[0] !== '..') err('Non-range passed as right side of clamp operator')
      let [,min,max] = b
      if (desc(a,scope).type == INT && desc(min,scope).type == INT && desc(max,scope).type == INT) {
        if (!includes.includes('util/i32.smax')) includes.push('util/i32.smax')
        if (!includes.includes('util/i32.smin')) includes.push('util/i32.smin')
        return `(call $util/i32.smax (call $util/i32.smin ${expr(a)} ${expr(max)}) ${expr(min)})`
      }
      return `(f64.max (f64.min ${fexpr(a)} ${fexpr(max)}) ${fexpr(min)})`
    },

    // [1,2,3]
    '['([,[,...inits]]) {
      let out = ``, members = 0
      memcount += MEM_STRIDE // we unify memory stride to f64 steps to avoid js typed array buttheart
      // second i32 stores array rotation info like a << 1
      // FIXME: wouldn't it be easier to init static arrays via data section?
      for (let init of inits) {
        let idesc = desc(init,scope)
        if (idesc.type === INT || idesc.type === FLOAT)
          out += `(f64.store (i32.const ${memcount + members++ * MEM_STRIDE}) ${fexpr(init)}) `
        else if (idesc.type === RANGE) {
          let [,min,max] = init
          // simple numeric range like [0..1]
          if (typeof max[1] === 'number') {
            // [..1] - no need for specific init
            if (!min) members += max[1]
            // [1..3]
            // FIXME: this range may need specifying, like -1.2..2
            else if (typeof min[1] === 'number') for (let v = min[1]; v <= max[1]; v++)
                out += `(f64.store (i32.const ${memcount + members++ * MEM_STRIDE}) (f64.const ${v})) `
            else err('Unimplemented array initializer: computed range min value')
          }
          else err('Unimplemented array initializer: computed range', init)
        }
        else err('Unimplemented array initializer',init)
      }
      // prepend initalizer
      out = `(i32.store (i32.const ${memcount-MEM_STRIDE}) (i32.const ${members})) ` + out
      out += `(i32.const ${memcount})`
      memcount += members * MEM_STRIDE

      return out
    },
    // a[b] or a[]
    '[]'([,a,b]) {
      // a[]
      if (!b) {
        let aDesc = desc(a,scope);
        if (aDesc.type !== PTR) err('Reading length of non-array', a);
        return `(i32.load (i32.sub (${aDesc.global?'global':'local'}.get $${a}) (i32.const ${MEM_STRIDE})))`
      }
      else {
        err('Unimplemented prop access')
      }
    },

    '='([,name,init]) {
      // FIXME: accept functions
      // x[y]=1, x.y=1
      if (name[0] === '[]' || name[0] === '.') {
        let [,ptr,prop] = name
        if (name[0] === '.') prop = [INT, parseInt(prop)]

        // FIXME: add static optimization here for property - to avoid calling util/idx if idx is known

        // dynamic props - access as a[(idx + len) % len]
        if (!includes.includes('util/idx')) includes.push('util/idx')
        return `(f64.store (i32.add ${expr(ptr)} (i32.shl (call $util/idx ${iexpr(prop)} ${expr(['[]',ptr])}) (i32.const ${Math.log2(MEM_STRIDE)}))) ${fexpr(init)})`
      }
      // x = y
      if (desc(init,scope).type !== FUNC) {
        if (scope[name].global)
          return `(global.set $${name} ${expr(init)})(global.get $${name})`
        else
          return `(local.tee $${name} ${expr(init)})`
      }

      // x = a -> b
      // FIXME: likely we want to assign function pointers as ids and store functions in a table
      if (desc(init,scope).type === FUNC) return expr(init, name)

      err('Strange assignment', node)
    },

    // a | b
    '|'([,a,b]) {
      console.log(a,b)
    },

    // a <| b
    '<|'([,a,b]) {
      // console.log("TODO: loops", a, b)
      loop++
      let res = `(loop $loop${loop} (if ${expr(a)} (then ${expr(b)} (br $loop${loop}))))`
      loop--
      return res
    }
  })

  // define variable in proper scope
  function define(name) {
    let v = scope[name]
    if (!v._defined && v.type !== FUNC) {
      let wtype = v.type === FLOAT ? 'f64' : 'i32'
      if (v.global) globals.push(`(global $${name} (mut ${wtype}) (${wtype}.const 0))`);
      else locals.push(`(local $${name} ${wtype})`)
      v._defined = true
    }
  }

  // render expression wrapped to float, if needed
  function fexpr(node) {
    if (desc(node, scope).type === FLOAT) return expr(node)
    return `(f64.convert_i32_s ${expr(node)})`;
  }
  // cast last expr into int
  function iexpr(node) {
    if (desc(node, scope).type === INT) return expr(node)
    return `(i32.trunc_f64_s ${expr(node)})`
  }


  // begin - pretend global to be a function init
  expr['->'](Object.assign(['->',,node],{scope:node.scope}), 'module/init')
  globals.push(`(start $module/init)`)

  // Provide exports
  let exp = ``
  for (let name in node.scope)
    if (node.scope[name].export)
      exp += `(export "${name}" (${node.scope[name].type === FUNC ? 'func' : 'global'} $${name}))`
  if (exp) globals.push(exp)

  // Declare includes
  for (let include of includes) {
    let [lib,member] = include.split('/')
    globals.unshift(stdlib[lib][member])
  }

  // Declare memories
  if (memcount) globals.unshift(`(memory (export "memory") ${Math.ceil(memcount / F64_PER_PAGE)})`)

  console.log(globals.join('\n'))
  console.log(...parseWat(globals.join('\n')))

  return globals.join('\n')
}
