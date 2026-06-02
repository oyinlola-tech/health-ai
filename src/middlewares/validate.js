import { errors } from "../utils/errors.js";

export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(errors.validation(result.error.flatten()));
    }
    req[source] = result.data;
    return next();
  };
}
