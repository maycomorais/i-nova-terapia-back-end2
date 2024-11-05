// src/common/validators/cpf.validator.ts
import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsCPF(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCPF',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          // Implementar validação de CPF
          return (
            typeof value === 'string' &&
            /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value)
          );
        },
      },
    });
  };
}
