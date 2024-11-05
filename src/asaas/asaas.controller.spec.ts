import { Test, TestingModule } from '@nestjs/testing';
import { AsaasController } from './asaas.controller';

describe('AsaasController', () => {
  let controller: AsaasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsaasController],
    }).compile();

    controller = module.get<AsaasController>(AsaasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
