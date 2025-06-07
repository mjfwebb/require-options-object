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

const rule = createRule({
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

      if (parameters.length <= 3) {
        return;
      }

      context.report({
        node,
        messageId: "requireOptions",
        data: { count: parameters.length },
        fix(fixer) {
          // Generate destructured props with defaults
          const properties = parameters.map((p) => {
            if (p.type === "Identifier") {
              return p.name;
            }
            if (
              p.type === "AssignmentPattern" &&
              p.left.type === "Identifier"
            ) {
              const name = p.left.name;
              const defaultText = sourceCode.getText(p.right);
              return `${name} = ${defaultText}`;
            }
            return sourceCode.getText(p);
          });
          const propertiesList = properties.join(", ");

          // Generate type declarations, preserving TS annotations and inferring literal types,
          // marking defaulted parameters as optional
          const types = parameters
            .map((p) => {
              let nameNode: TSESTree.Identifier;

              if (p.type === "Identifier") {
                nameNode = p;
              } else if (
                p.type === "AssignmentPattern" &&
                p.left.type === "Identifier"
              ) {
                nameNode = p.left;
              } else {
                const text = sourceCode.getText(p);
                return `${text}: any`;
              }

              const typeAnno = nameNode.typeAnnotation?.typeAnnotation;
              let typeText: string;
              if (typeAnno) {
                typeText = sourceCode.getText(typeAnno);
              } else if (
                p.type === "AssignmentPattern" &&
                p.right.type === "Literal" &&
                typeof p.right.value === "string"
              ) {
                typeText = "string";
              } else if (
                p.type === "AssignmentPattern" &&
                p.right.type === "Literal" &&
                typeof p.right.value === "number"
              ) {
                typeText = "number";
              } else if (
                p.type === "AssignmentPattern" &&
                p.right.type === "Literal" &&
                typeof p.right.value === "boolean"
              ) {
                typeText = "boolean";
              } else {
                typeText = "any";
              }

              const optionalFlag =
                nameNode.optional || p.type === "AssignmentPattern" ? "?" : "";
              const name = nameNode.name;
              return `${name}${optionalFlag}: ${typeText}`;
            })
            .join("; ");

          const updatedParameter = `{ ${propertiesList} }: { ${types} }`;

          const first = parameters[0];
          const last = parameters[parameters.length - 1];
          return fixer.replaceTextRange(
            [first.range[0], last.range[1]],
            updatedParameter
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

export default rule;
