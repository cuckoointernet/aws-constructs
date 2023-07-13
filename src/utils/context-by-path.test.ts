/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import * as cdk from "aws-cdk-lib";
import { getContextByPath } from "./context-by-path";

const context = {
  foo: {
    bar: {
      baz: "hello world",
    },
  },
};

describe("getContextByPath", () => {
  it("should return a deeply nested value from inside the context", () => {
    const app = new cdk.App({ context });
    const stack = new cdk.Stack(app);
    const result = getContextByPath(stack, "foo.bar.baz");
    expect(result).toEqual("hello world");
  });

  it("should return nested objects from the top level of the context", () => {
    const app = new cdk.App({ context });
    const stack = new cdk.Stack(app);
    const result = getContextByPath(stack, "foo");
    expect(result).toEqual({
      bar: {
        baz: "hello world",
      },
    });
  });

  it("should return nested objects not at the top level of the context", () => {
    const app = new cdk.App({ context });
    const stack = new cdk.Stack(app);
    const result = getContextByPath(stack, "foo.bar");
    expect(result).toEqual({
      baz: "hello world",
    });
  });

  it("should return a deeply nested value using an explicit delimiter", () => {
    const app = new cdk.App({ context });
    const stack = new cdk.Stack(app);
    const delimiter = ":";
    const result = getContextByPath(stack, "foo:bar:baz", delimiter);
    expect(result).toEqual("hello world");
  });

  it("should return undefined if the top level context path does not exist", () => {
    const app = new cdk.App({ context });
    const stack = new cdk.Stack(app);
    const result = getContextByPath(stack, "bar");
    expect(result).toBeUndefined();
  });

  it("should return undefined if the context path only partially exists", () => {
    const app = new cdk.App({ context });
    const stack = new cdk.Stack(app);
    const result = getContextByPath(stack, "foo.bar.missing");
    expect(result).toBeUndefined();
  });

  it("should return undefined if the entire context path does not exist", () => {
    const app = new cdk.App({ context });
    const stack = new cdk.Stack(app);
    const result = getContextByPath(stack, "this.isnt.declared.in.the.context");
    expect(result).toBeUndefined();
  });
});
