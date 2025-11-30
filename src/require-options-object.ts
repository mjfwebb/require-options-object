import { ESLintUtils, TSESLint, TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/mjfwebb/require-options-object`
);

type MessageIds = "requireOptions";
type Options = [];

function isStdCallback(
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression,
  methods: string[]
): boolean {
  const parent = node.parent;
  if (!parent || parent.type !== "CallExpression") {
    return false;
  }
  const callee = parent.callee;
  return (
    callee.type === "MemberExpression" &&
    callee.property.type === "Identifier" &&
    methods.includes(callee.property.name)
  );
}

function isPropertyCallback(
  node:
    | TSESTree.FunctionDeclaration
    | TSESTree.FunctionExpression
    | TSESTree.ArrowFunctionExpression
): boolean {
  const parent = node.parent;
  if (!parent) {
    return false;
  }

  // Check if this function is a property value in an object (but not a method)
  // e.g., { listener: (a, b, c, d) => {} } or { listener: function(a, b, c, d) {} }
  // but NOT { method(a, b, c, d) {} } which is a method shorthand
  if (parent.type === "Property" && parent.value === node && !parent.method) {
    return true;
  }

  // Check if this function is assigned to a property
  // e.g., obj.listener = (a, b, c, d) => {}
  if (
    parent.type === "AssignmentExpression" &&
    parent.right === node &&
    parent.left.type === "MemberExpression"
  ) {
    return true;
  }

  // Check if this function is being passed as an argument to a function call
  // e.g., eventEmitter.on('event', (a, b, c, d) => {}) or addEventListener('click', function(a, b, c, d) {})
  // These callbacks' signatures are typically controlled by external APIs
  if (
    parent.type === "CallExpression" &&
    parent.arguments.some((arg) => arg === node)
  ) {
    return true;
  }

  return false;
}

export const rule = createRule({
  name: "require-options-object",
  defaultOptions: [],
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce using an options object when a function has more than three parameters",
    },
    fixable: "code",
    schema: [],
    messages: {
      requireOptions: "Use an options object instead of {{count}} parameters.",
    },
  },
  create(context: TSESLint.RuleContext<MessageIds, Options>) {
    const sourceCode = context.sourceCode;

    function getParamInfo(p: TSESTree.Parameter): {
      name: string;
      defaultNode: TSESTree.Node | null;
      defaultText: string | null;
      typeAnno: string | null;
      optional: boolean;
      hadType: boolean;
    } {
      // Unwrap TSParameterProperty
      if (p.type === "TSParameterProperty") {
        const param = p.parameter;
        if (param.type === "Identifier") {
          const name = param.name;
          const typeAnno = param.typeAnnotation
            ? sourceCode.getText(param.typeAnnotation.typeAnnotation)
            : null;
          return {
            name,
            defaultNode: null,
            defaultText: null,
            typeAnno,
            optional: !!param.optional,
            hadType: !!param.typeAnnotation,
          };
        }
      }
      // Regular Identifier
      if (p.type === "Identifier") {
        const name = p.name;
        const typeAnno = p.typeAnnotation
          ? sourceCode.getText(p.typeAnnotation.typeAnnotation)
          : null;
        return {
          name,
          defaultNode: null,
          defaultText: null,
          typeAnno,
          optional: !!p.optional,
          hadType: !!p.typeAnnotation,
        };
      }
      // AssignmentPattern
      if (p.type === "AssignmentPattern" && p.left.type === "Identifier") {
        const name = p.left.name;
        const defaultNode = p.right;
        const defaultText = sourceCode.getText(p.right);
        const typeAnno = p.left.typeAnnotation
          ? sourceCode.getText(p.left.typeAnnotation.typeAnnotation)
          : null;
        return {
          name,
          defaultNode,
          defaultText,
          typeAnno,
          optional: true,
          hadType: !!p.left.typeAnnotation,
        };
      }
      // Fallback
      const text = sourceCode.getText(p);
      return {
        name: text,
        defaultNode: null,
        defaultText: null,
        typeAnno: null,
        optional: false,
        hadType: false,
      };
    }

    function inferType(info: {
      defaultNode: TSESTree.Node | null;
      typeAnno: string | null;
    }): string {
      if (info.typeAnno) {
        return info.typeAnno;
      }
      const node = info.defaultNode;
      if (node && node.type === "Literal") {
        const rawVal = (node as TSESTree.Literal).value;
        switch (typeof rawVal) {
          case "string":
            return "string";
          case "number":
            return "number";
          case "boolean":
            return "boolean";
        }
      }
      return "any";
    }

    function checkParameters(
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression
    ): void {
      // Skip if this function comes from an explicit type alias or interface
      if (
        node.parent?.type === "VariableDeclarator" &&
        (node.parent.id as TSESTree.Identifier).typeAnnotation
      ) {
        return;
      }

      const parameters = node.params;
      if (isStdCallback(node, ["replaceAll"])) {
        return;
      }
      if (isPropertyCallback(node)) {
        return;
      }
      if (parameters.length <= 3) {
        return;
      }

      context.report({
        node,
        messageId: "requireOptions",
        data: { count: parameters.length },
        fix(fixer) {
          const infos = parameters.map(getParamInfo);
          const propsList = infos
            .map((i) =>
              i.defaultText ? `${i.name} = ${i.defaultText}` : i.name
            )
            .join(", ");

          // Only add a type annotation if at least one original param had a type
          const hadAnyType = infos.some((i) => i.hadType);
          let typesList = "";
          if (hadAnyType) {
            typesList = infos
              .map((i) => {
                const opt = i.optional ? "?" : "";
                const typeTxt = inferType(i);
                return `${i.name}${opt}: ${typeTxt}`;
              })
              .join("; ");
          }

          const replacement = hadAnyType
            ? `{ ${propsList} }: { ${typesList} }`
            : `{ ${propsList} }`;
          const first = parameters[0];
          const last = parameters[parameters.length - 1];
          return fixer.replaceTextRange(
            [first.range[0], last.range[1]],
            replacement
          );
        },
      });
    }

    return {
      FunctionDeclaration: checkParameters,
      FunctionExpression: checkParameters,
      ArrowFunctionExpression: checkParameters,
    };
  },
});
