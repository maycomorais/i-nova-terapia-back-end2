import { Test, TestingModule } from '@nestjs/testing';
import { PsychologistsController } from './psychologists.controller';

describe('PsychologistsController', () => {
  let controller: PsychologistsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PsychologistsController],
    }).compile();

    controller = module.get<PsychologistsController>(PsychologistsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
