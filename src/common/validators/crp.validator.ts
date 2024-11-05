// src/common/validators/crp.validator.ts
import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsCRP(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCRP',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && /^\d{2}\/\d{5}$/.test(value);
        },
        defaultMessage() {
          return 'CRP inválido. Use o formato XX/XXXXX';
        },
      },
    });
  };
}
