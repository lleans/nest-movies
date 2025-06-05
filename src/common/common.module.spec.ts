import { Test, TestingModule } from '@nestjs/testing';
import { CommonModule } from './common.module';
import { ConfigModule } from '@nestjs/config';

describe('CommonModule', () => {
  let commonModule: CommonModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CommonModule, ConfigModule.forRoot()],
    }).compile();

    commonModule = module.get<CommonModule>(CommonModule);
  });

  it('should be defined', () => {
    expect(commonModule).toBeDefined();
  });
});
