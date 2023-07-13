import getValue from "get-value";
import { Construct } from "constructs";

/**
 * A utility function that can be used to retrieve a _nested_ value from the [CDK context](https://docs.aws.amazon.com/cdk/v2/guide/context.html).
 */
export const getContextByPath = (
  construct: Construct,
  path: string,
  pathDelimiter = "."
): any => {
  const pathParts = path.split(pathDelimiter);
  const firstPathPart = pathParts[0];
  const pathPartsMinusFirst = pathParts.slice(1);

  const context = construct.node.tryGetContext(firstPathPart) as
    | Record<string, any>
    | string
    | undefined;

  if (!context) {
    // Cannot drill deeper because top level context value not found
    return undefined;
  }

  if (pathPartsMinusFirst.length === 0) {
    // User requested a top level context value, no need to drill deeper
    return context;
  }

  if (typeof context === "string") {
    // User requested a nested value but top level context value was not an object
    return undefined;
  }

  return getValue(context, pathPartsMinusFirst.join("."));
};
