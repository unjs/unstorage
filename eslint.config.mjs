import unjs from "eslint-config-unjs";

export default unjs({
  ignores: ["drivers", "/server*", "docs/.*", "test/browser-extension"],
  rules: {
    "unicorn/no-null": 0,
    "unicorn/prevent-abbreviations": 0,
    "@typescript-eslint/no-non-null-assertion": 0,
    "unicorn/prefer-string-replace-all": 0,
    "unicorn/prefer-at": 0,
    "unicorn/catch-error-name": 0,
    "unicorn/prefer-logical-operator-over-ternary": 0,
    "unicorn/prefer-ternary": 0,
    "unicorn/prefer-string-raw": 0,
    "@typescript-eslint/no-empty-object-type": 0,
    "unicorn/prefer-global-this": 0, // window. usage
  },
});
