# 🎧 lino

**Lino** (*li*ne *no*ise) is low-level language for sound design, processing and utilities. It has minimal common syntax, useful language patterns (units, ranges, groups, stateful vars, pipes), static/linear memory and compiles to 0-runtime WASM. It also has smooth operator and organic sugar.

<!--[Motivation](./docs/motivation.md)  |  [Documentation](./docs/reference.md)  |  [Examples](./docs/examples.md).-->

<!--
## Projects using lino

* [web-audio-api](https:\\github.com/audiojs/web-audio-api)
* [audiojs](https:\\github.com/audiojs/)
* [sonr](https:\\github.com/sonr/)
-->


## Reference

```
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ numbers
16, 0x10, 0b0;                  \\ int, hex or binary
16.0, .1, 1e3, 2e-3;            \\ float
true = 0b1, false = 0b0;        \\ alias booleans

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ units
1k = 1000; 1pi = 3.1415;        \\ define units
1s = 44100; 1ms = 0.001s;       \\ useful for sample indexes
10.1k, 2pi;                     \\ units deconstruct to numbers: 10100, 6.283
1h2m3.5s;                       \\ unit combinations

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ standard operators
+ - * / % -- ++                 \\ arithmetical
&& || ! ?:                      \\ logical
& | ^ ~ >> <<                   \\ binary (for integer part of number)
== != >= <=                     \\ comparisons
. []                            \\ member access

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ extended operators
** // %%                        \\ power, floor div, unsigned mod (wraps negatives)
<? <?= ..                       \\ clamp/min/max, range
<| <|= # ##                     \\ each, map, member
*                               \\ stateful variable
^ ^^ ^^^                        \\ break/return scopes
@ .                             \\ import, export

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ variables
foo=1, bar=2.0;                 \\ declare vars
Ab_C_F#, $0, Δx, _;             \\ names permit alnum, unicodes, #, _, $
fooBar123 == FooBar123;         \\ names are case-insensitive
default=1, eval=fn, else=0;     \\ lino has no reserved words

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ statements
foo();                          \\ semi-colons at end of line are mandatory
(c = a + b; c);                 \\ parens define scope, return last element
(a = b+1; a,b,c);               \\ scope can return multiple values
(a ? ^b ; c);                   \\ preliminary return value
(a ? (b ? ^^c) : d);            \\ break 2 scopes

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ conditions
sign = a < 0 ? -1 : +1;         \\ inline ternary
(2+2 >= 4) ?                    \\ multiline ternary
  log("Math works!")            \\
: "a" < "b" ?                   \\ else if
  log("Sort strings")           \\
: (                             \\ else
  log("Get ready");             \\
  log("Last chance")            \\
);                              \\
a || b ? c;                     \\ if a or b then c
a && b ?: c;                    \\ elvis: if not a and b then c
a = b ? c;                      \\ if b then a = c (else a = 0)

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ ranges
1..10;                          \\ basic range from 1 to 10
1.., ..10, ..;                  \\ open ranges
10..1;                          \\ reverse range
1.08..108.0;                    \\ float range
(x-1)..(x+1);                   \\ calculated ranges
x <= 0..10;                     \\ is x in 0..10 range?
x <? 0..10;                     \\ max(min(x, 10), 0)
a,b,c = 0..2;                   \\ a==0, b==1, c==2
(-10..10)[];                    \\ span is 20

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ groups
a, b, c;                        \\ groups are sugar, not primitive
(a, b, c)++;                    \\ inc multiple elements: (a++, b++, c++)
(a, (b, c));                    \\ always flat: (a, b, c)
(a,b,c) = (d,e,f);              \\ assign: a=d, b=e, c=f
(a,b) = (b,a);                  \\ swap: temp=a; a=b; b=temp;
(a,b) + (c,d);                  \\ any ops act on members: (a+c, b+d)
(a,b).x;                        \\ (a.x, b.x);
(a,b) = (c,d,e);                \\ (a=c, b=d);
(a,b,c) = d;                    \\ (a=d, b=d, c=d);
a = (b,c,d);                    \\ (a=b);
(a,,b) = (c,d,e);               \\ (a=c, d, b=e);
(a,b,c) = (d,,e);               \\ (a=d, b, c=e);
a = b, c = d;                   \\ assignment precedence: (a = b), (c = d)
(a,b,c) = fn();                 \\ fn returns multiple values;

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ functions
double(n) = n*2;                \\ inline function
times(m = 1, n <= 1..) = (      \\ optional, clamped args
  n == 0 ? ^n;                  \\ return n
  m*n                           \\
);                              \\
times(3,2);                     \\ 6
times(5);                       \\ 5. optional argument
times(n: 10);                   \\ 10. named argument
times(,11);                     \\ 11. skipped argument
copy = triple;                  \\ capture function
copy(10);                       \\ also 30
x() = (1,2,3);                  \\ return multiple values
(a,b,c) = x();                  \\ destructure returns

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ stateful variables
a() = ( *i=0; i++ );            \\ i persists value between a calls
a(), a();                       \\ 0, 1
b() = (                         \\
  *i[4];                        \\ local memory of 4 items
  i.1 = i.2 + 1;                \\ write previous i.2 to current i.1
  i[1..] = i[-1,1..];           \\ shift memory
  i.1                           \\ return current item
);                              \\
b(), b(), b();                  \\ 1, 2, 3

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ lists
m[10];                          \\ create empty list of 10, same as m[1..10]
m = [1,2,3,4];                  \\ create list with 4 values
m = [l:2, r:4, c:6];            \\ create with position aliases
m = [n[..]];                    \\ create copy of n
m = [1, 2..4, last:5];          \\ create from mixed definition
m = [1, [2, 3, [4]]];           \\ create nested lists (tree)
m = [1..4 <| # * 2];            \\ create from list comprehension
(first, last) = (m.1, m.last);  \\ get by static index (1-based) / alias
(first, last) = (m[1], m[-1]);  \\ get by dynamic index
(second, third) = m[2..];       \\ get multiple values
(first, last:c) = m[..];        \\ get all
length = m[];                   \\ get length
m[1] = 1;                       \\ set value
m[2..] = (1, 2..4, n[1..3]);    \\ set multiple values from offset 2
m[1..] = 1..4 <| # * 2;         \\ set via iteration
m[1,2] = m[2,1];                \\ rearrange
m[1..] = m[-1..1];              \\ reverse order
m[1..] = m[2..,1];              \\ rotate items

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ iteration
(a, b, c) <| x(#);              \\ for each item # call x(item)
(10..1 <| (                     \\ iterate range
  # < 3 ? ^^;                   \\ ^^ break
  # < 5 ? ^;                    \\ ^ continue
));                             \\
x[0..10] <|= # * 2;             \\ map part of list
(0.. <| (# >= 3 ? ^^; log(#))); \\ while idx < 3 log(idx)
items <| a(#) <| b(#);          \\ chain iterations
items <| (..# <| a(##));        \\ ## is nested iteration item

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ import, export
1pi = @math.pi;                 \\ use imported member directly
@math:sin,pi,cos;               \\ import members
x, y, z.                        \\ exports members
```

<!--

\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ strings
\\ NOTE: can be not trivial to
hi="hello";                     \\ strings
string="{hi} world";            \\ interpolated string: "hello world"
"\u0020", "\x20";               \\ unicode or ascii codes
string[1]; string.1;            \\ positive indexing from first element [0]: 'e'
string[-3];                     \\ negative indexing from last element [-1]: 'r'
string[2..10];                  \\ substring
string[1, 2..10, -1];           \\ slice/pick multiple elements
string[-1..0];                  \\ reverse
string[];                       \\ length
string == string;               \\ comparison (==,!=,>,<)
string + string;                \\ concatenation: "hello worldhello world"
string - string;                \\ removes all occurences of the right string in the left string: ""
string / string;                \\ split: "a b" / " " = ["a", "b"]
string * list;                  \\ join: " " * ["a", "b"] = "a b"
string * 2;                     \\ repeat: "abc" * 2 = "abcabc"
NOTE: indexOf can be done as `string | (x,i) -> (x == "l" ? i)`
-->


## Examples

### Gain Processor

Provides k-rate amplification for block of samples.

```
gain(                               \\ define a function with block, volume arguments.
  block,                            \\ block is a list argument
  volume <= 0..100                  \\ volume is limited to 0..100 range
) = (
  block <|= # * volume;             \\ map each sample via multiplying by value
);

gain([0..5 <| # * 0.1], 2);         \\ 0, .2, .4, .6, .8, 1

gain.                               \\ export gain function
```

<!--Minifies as `gain(b,v)=b|=x->x*v.`-->

### Biquad Filter

A-rate (per-sample) biquad filter processor.

```
@math: pi,cos,sin;                  \\ import pi, sin, cos from math

1pi = pi;                           \\ define pi units
1s = 44100;                         \\ define time units in samples
1k = 10000;                         \\ basic si units

lpf(                                \\ per-sample processing function
  x0,                               \\ input sample value
  freq <= 1..10k = 100,             \\ filter frequency, float
  Q <= 0.001..3.0 = 1.0             \\ quality factor, float
) = (
  *(x1, y1, x2, y2) = 0;            \\ define filter state

  \\ lpf formula
  w = 2pi * freq / 1s;
  (sin_w, cos_w) = (sin(w), cos(w));
  a = sin_w / (2.0 * Q);

  (b0, b1, b2) = ((1.0 - cos_w) / 2.0, 1.0 - cos_w, b0);
  (a0, a1, a2) = (1.0 + a, -2.0 * cos_w, 1.0 - a);

  (b0, b1, b2, a1, a2) *= 1.0 / a0;

  y0 = b0*x0 + b1*x1 + b2*x2 - a1*y1 - a2*y2;

  (x1, x2) = (x0, x1);              \\ shift state
  (y1, y2) = (y0, y1);

  y0                                \\ return y0
);

\\ (0, .1, .3) <| lpf(#, 108, 5)

lpf.                                \\ export lpf function, end program
```

### ZZFX

Generates ZZFX's [coin sound](https:\\codepen.io/KilledByAPixel/full/BaowKzv) `zzfx(...[,,1675,,.06,.24,1,1.82,,,837,.06])`.

```
@math: pi,abs,sin,round;

1pi = pi;
1s = 44100;
1ms = 1s / 1000;

\\ define waveform generators
oscillator = [
  saw(phase) = (1 - 4 * abs( round(phase/2pi) - phase/2pi )),
  sine(phase) = sin(phase)
];

\\ applies adsr curve to sequence of samples
adsr(
  x,
  a <= 1ms..,                     \\ prevent click
  d,
  (s, sv=1),                      \\ optional group-argument
  r
) = (
  *i = 0;                         \\ internal counter, increments after fn body
  t = i / 1s;

  total = a + d + s + r;

  y = t >= total ? 0 : (
    t < a ? t/a :                 \\ attack
    t < a + d ?                   \\ decay
    1-((t-a)/d)*(1-sv) :          \\ decay falloff
    t < a  + d + s ?              \\ sustain
    sv :                          \\ sustain volume
    (total - t)/r * sv
  ) * x;
  i++;
  y
);

\\ curve effect
curve(x, amt<=0..10=1.82) = (sign(x) * abs(x)) ** amt;

\\ coin = triangle with pitch jump, produces block
coin(freq=1675, jump=freq/2, delay=0.06, shape=0) = (
  out[1023];                      \\ output block of 1024 samples
  *i=0;
  *phase = 0;                     \\ current phase
  t = i / 1s;

  out <|= oscillator[shape](phase)
      <| adsr(#, 0, 0, .06, .24)
      <| curve(#, 1.82)

  i++
  phase += (freq + (t > delay ? jump : 0)) * 2pi / 1s;
).
```

<!--
## [Freeverb](https:\\github.com/opendsp/freeverb/blob/master/index.js)

```
@'./combfilter.li#comb';
@'./allpass.li#allpass';

1s = 44100;

(a1,a2,a3,a4) = (1116,1188,1277,1356);
(b1,b2,b3,b4) = (1422,1491,1557,1617);
(p1,p2,p3,p4) = (225,556,441,341);

\\ TODO: stretch

reverb(input, room=0.5, damp=0.5) = (
  *combs_a = a0,a1,a2,a3 | a -> stretch(a),
  *combs_b = b0,b1,b2,b3 | b -> stretch(b),
  *aps = p0,p1,p2,p3 | p -> stretch(p);

  combs = (
    (combs_a | x -> comb(x, input, room, damp) |> (a,b) -> a+b) +
    (combs_b | x -> comb(x, input, room, damp) |> (a,b) -> a+b)
  );

  (combs, aps) | (input, coef) -> p + allpass(p, coef, room, damp)
);
```

Features:

* _multiarg pipes_ − pipe can consume groups. Depending on arity of target it can act as convolver: `a,b,c | (a,b) -> a+b` becomes  `(a,b | (a,b)->a+b), (b,c | (a,b)->a+b)`.
* _fold operator_ − `a,b,c |> fn` acts as `reduce(a,b,c, fn)`, provides efficient way to reduce a group or array to a single value.

### [Floatbeat](https:\\dollchan.net/bytebeat/index.html#v3b64fVNRS+QwEP4rQ0FMtnVNS9fz9E64F8E38blwZGvWDbaptCP2kP3vziTpumVPH0qZyXzfzHxf8p7U3aNJrhK0rYHfgHAOZZkrlVVu0+saKbd5dTXazolRwnvlKuwNvvYORjiB/LpyO6pt7XhYqTNYZ1DP64WGBYgczuhAQgpiTXEtIwP29pteBZXqwTrB30jwc7i/i0jX2cF8g2WIGKlhriTRcPjSvcVMBn5NxvgCOc3TmqZ7/IdmmEnAMkX2UPB3oMHdE9WcKqVK+i5Prz+PKa98uOl60RgE6zP0+wUr+qVpZNsDUjKhtyLkKvS+LID0FYVSrJql8KdSMptKKlx9eTIbcllvdf8HxabpaJrIXEiycV7WGPeEW9Y4v5CBS07WBbUitvRqVbg7UDtQRRG3dqtZv3C7bsBbFUVcALvwH86MfSDws62fD7CTb0eIghE/mDAPyw9O9+aoa9h63zxXl2SW/GKOFNRyxbyF3N+FA8bPyzFb5misC9+J/XCC14nVKfgRQ7RY5ivKeKmmjOJMaBJSbEZJoiZZMuj2pTEPGunZhqeatOEN3zadxrXRmOw+AA==)

Transpiled floatbeat/bytebeat song:

```
@'math#asin,sin,pi';

1s = 44100;

fract(x) = x % 1;
mix(a, b, c) = (a * (1 - c)) + (b * c);
tri(x) = 2 * asin(sin(x)) / pi;
noise(x) = sin((x + 10) * sin((x + 10) ** (fract(x) + 10)));
melodytest(time) = (
  melodyString = "00040008",
  melody = 0;

  0..5 <| (
    melody += tri(
      time * mix(
        200 + (# * 900),
        500 + (# * 900),
        melodyString[floor(time * 2) % melodyString[]] / 16
      )
    ) * (1 - fract(time * 4))
  );

  melody
)
hihat(time) = noise(time) * (1 - fract(time * 4)) ** 10;
kick(time) = sin((1 - fract(time * 2)) ** 17 * 100);
snare(time) = noise(floor((time) * 108000)) * (1 - fract(time + 0.5)) ** 12;
melody(time) = melodytest(time) * fract(time * 2) ** 6 * 1;

song() = (
  *t=0; @t++; time = t / 1s;
  (kick(time) + snare(time)*.15 + hihat(time)*.05 + melody(time)) / 4
)
```

Features:

* _loop operator_ − `cond <| expr` acts as _while_ loop, calling expression until condition holds true. Produces sequence as result.
* _string literal_ − `"abc"` acts as array with ASCII codes.
* _length operator_ − `items[]` returns total number of items of either an array, group, string or range.
-->

### Other examples

* [Freeverb](/examples/freeverb.li)
* [Floatbeat](/examples/floatbeat.li)
* [Complete ZZFX](/examples/zzfx.li)

See [all examples](/examples)


## Usage

Lino is available as JS package.

`npm i lino`

<!--
CLI:
```sh
lino source.li > compiled.wasm
```
-->

From JS:

```js
import * as lino from 'lino'

\\ create wasm arrayBuffer
const buffer = lino.compile(`mult(x,y) = x*y; mult.`)

\\ create wasm instance
const module = new WebAssembly.Module(buffer)
const instance = new WebAssembly.Instance(module)

\\ use API
const {mult} = instance.exports
mult(108,2) \\ 216
```




## Motivation

JavaScript and _Web Audio API_ is not suitable for audio purposes – it has unpredictable pauses, glitches and so on. It's better handled in worklet with WASM. Also, audio processing generally doesn't have cross-platform solution, many environments lack audio features.

_Lino_ fills that gap, providing efficient, resilient & accessible layer. It targets browsers, [audio worklets](https:\\developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process), web-workers, nodejs, VST, Rust, Python, Go, [embedded systems](https:\\github.com/bytecodealliance/wasm-micro-runtime) etc. Inspired by [_mono_](https:\\github.com/stagas/mono), _zzfx_, _bytebeat_, _[hxos](https:\\github.com/stagas/hxos)_, [_min_](https:\\github.com/r-lyeh/min) etc.

### Principles

* _Common syntax_: familiar code, copy-pastable floatbeats.
* _No-keywords_: safe var names, max minification, i18l code.
* _Case-agnostic_: changing case doesn't affect code, making it URL-safe, typo-proof.
* _Space-agnistic_: changing spaces/newlines doesn't affect code, making it compressable.
* _Type inference_: type is defined by operator, not via dedicated syntax.
* _No OOP_: functions, stateful vars.
* _No lambda funcs_: no unnecessary scope persistency.
* _Groups_: multiple returns, multiple operands.
* _Explicit_: wysiwyg, no implicit globals, no import-alls.
* _Ranges_: prevent blowing up values.
* _Pipes_: iterators instead of loops.
* _Low-level_: no fancy features beyond math and buffers.
* _Static/Linear memory_: no garbage to collect.
* _0 runtime_: statically analyzable.
* _Flat_: no nested scopes, flat arrays, flat groups.

<p align=center><a href="https:\\github.com/krsnzd/license/">🕉</a></p>
