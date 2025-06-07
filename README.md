# @mjfwebb/require-options-object

An eslint/teslint plugin that enforces using an options object for functions with more than three parameters.

## Installation

```bash
npm install --save-dev @mjfwebb/require-options-object
```

## Usage

Import and register the plugin in your teslint configuration:

```js
import requireOptionsObject from "@mjfwebb/require-options-object";

export default {
  plugins: {
    "require-options-object": requireOptionsObject,
  },
  rules: {
    // Require options object for functions with more than three parameters
    "require-options-object/require-options-object": "error",
  },
};
```

## Rule: require-options-object/require-options-object

**Enforces using an options object when a function has more than three parameters.**

### Examples

#### ❌ Incorrect

```js
function test(a, b, c, d) {
  return a + b + c + d;
}

const fn = (x, y = 2, z, w = "w") => x * y * z * parseInt(w);

const obj = {
  method(a, b, c, d) {
    return;
  },
};

class C {
  constructor(a, b, c, d) {}
}

class C2 {
  constructor(a: string, b: number, c: boolean, d: unknown) {}
}
```

#### ✅ Correct

```js
function test({ a, b, c, d }) {
  return a + b + c + d;
}

const fn = ({ x, y = 2, z, w = "w" }) => x * y * z * parseInt(w);

const obj = {
  method({ a, b, c, d }) {
    return;
  },
};

class C {
  constructor({ a, b, c, d }) {}
}

class C2 {
  constructor({
    a,
    b,
    c,
    d,
  }: {
    a: string,
    b: number,
    c: boolean,
    d: unknown,
  }) {}
}
```

### Notes

- Functions with three or fewer parameters are not affected.
- Standard callbacks (e.g., `replaceAll(x => x.toUpperCase())`) are ignored.
- The rule auto-fixes by converting parameters to a destructured options object.
- If none of the original parameters had a type annotation, the generated destructured parameter will not have a type annotation either.
- Functions with rest parameters (e.g., `...rest`) are not affected.
- Functions with destructured parameters as the first parameter are not auto-fixed.

## License

MIT
