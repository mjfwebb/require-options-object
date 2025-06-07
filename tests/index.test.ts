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
    class C {
      constructor(
        private gameState: string,
        private areas: string,
        private rng: string,
      ) {}
    }
    `,
  ],
  invalid: [
    {
      code: `function test(a, b, c, d) { return a + b + c + d; }`,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `function test({ a, b, c, d }: { a: any; b: any; c: any; d: any }) { return a + b + c + d; }`,
    },
    {
      code: `const fn = (x, y = 2, z, w = 'w') => x * y * z * parseInt(w);`,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `const fn = ({ x, y = 2, z, w = 'w' }: { x: any; y?: number; z: any; w?: string }) => x * y * z * parseInt(w);`,
    },
    {
      code: `const obj = { method(a, b, c, d) { return; } };`,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `const obj = { method({ a, b, c, d }: { a: any; b: any; c: any; d: any }) { return; } };`,
    },
    {
      code: `
      class C {
        constructor(
          private gameState: string,
          private gameStateEmitter: string,
          private areas: string,
          private rng: string,
        ) {}
      }
      `,
      errors: [{ messageId: "requireOptions", data: { count: 4 } }],
      output: `
      class C {
        constructor(
          { gameState, gameStateEmitter, areas, rng }: { gameState: string; gameStateEmitter: string; areas: string; rng: string },
        ) {}
      }
      `,
    },
  ],
});
