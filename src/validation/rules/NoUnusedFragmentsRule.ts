import { GraphQLError } from '../../error/GraphQLError.ts';

import type {
  FragmentDefinitionNode,
  OperationDefinitionNode,
} from '../../language/ast.ts';
import type { ASTVisitor } from '../../language/visitor.ts';

import type { ASTValidationContext } from '../ValidationContext.ts';

/**
 * No unused fragments
 *
 * A GraphQL document is only valid if all fragment definitions are spread
 * within operations, or spread within other fragments spread within operations.
 *
 * See https://spec.graphql.org/draft/#sec-Fragments-Must-Be-Used
 */
export function NoUnusedFragmentsRule(
  context: ASTValidationContext,
): ASTVisitor {
  const operationDefs: Array<OperationDefinitionNode> = [];
  const fragmentDefs: Array<FragmentDefinitionNode> = [];

  return {
    OperationDefinition(node) {
      operationDefs.push(node);
      return false;
    },
    FragmentDefinition(node) {
      fragmentDefs.push(node);
      return false;
    },
    Document: {
      leave() {
        const fragmentNameUsed = Object.create(null);
        for (const operation of operationDefs) {
          for (const fragment of context.getRecursivelyReferencedFragments(
            operation,
          )) {
            fragmentNameUsed[fragment.name.value] = true;
          }
        }

        for (const fragmentDef of fragmentDefs) {
          const fragName = fragmentDef.name.value;
          if (fragmentNameUsed[fragName] !== true) {
            context.reportError(
              new GraphQLError(
                `Fragment "${fragName}" is never used.`,
                fragmentDef,
              ),
            );
          }
        }
      },
    },
  };
}
