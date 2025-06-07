import { RuleTester } from "@typescript-eslint/rule-tester";
import { rule } from "../src/require-options-object.js";

const ruleTester = new RuleTester();

ruleTester.run("require-options-object", rule, {
  valid: [
    // up to 3 params is fine
    `function foo(a, b, c) { return a + b + c; }`,
    `const bar = (a: number, b: string, c = 'default'): void => { console.log(a, b, c); }`,
    `const baz = function (a, b, c) {};`,
    // standard methods ignored
    `['a', 'b'].replaceAll(x => x.toUpperCase());`,

    // 3‐param constructor is OK
    `
    class MyClass {
      constructor(a, b, c) {
        this.a = a;
        this.b = b;
        this.c = c;
      }
    }
    `,

    // Additional test: function with rest parameter (should be valid)
    `function many(a, b, ...rest) { return rest.length; }`,
  ],
  invalid: [
    {
      code: `function test(a, b, c, d) { return a + b + c + d; }`,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `function test({ a, b, c, d }) { return a + b + c + d; }`,
    },
    {
      code: `const fn = (x, y = 2, z, w = 'w') => x * y * z * parseInt(w);`,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `const fn = ({ x, y = 2, z, w = 'w' }) => x * y * z * parseInt(w);`,
    },
    {
      code: `const obj = { method(a, b, c, d) { return; } };`,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `const obj = { method({ a, b, c, d }) { return; } };`,
    },
    {
      code: `
      class C {
        constructor(
          private thing: Thing,
          private those: Those,
          private quantity: number,
          test: string,
        ) {
          // some logic  
        }
      }
      `,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `
      class C {
        constructor(
          { thing, those, quantity, test }: { thing: Thing; those: Those; quantity: number; test: string },
        ) {
          // some logic  
        }
      }
      `,
    },
    {
      code: `
      class C {
        constructor(
          a: string,
          b: number,
          c: boolean,
          d: unknown,
        ) {}
      }
      `,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `
      class C {
        constructor(
          { a, b, c, d }: { a: string; b: number; c: boolean; d: unknown },
        ) {}
      }
      `,
    },
    {
      code: `
      class C {
        constructor(
          a, b, c, d,
        ) {}
      }
      `,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `
      class C {
        constructor(
          { a, b, c, d },
        ) {}
      }
      `,
    },
  ],
});
