import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from '../clients/gql/gql.service';
import { PhiService } from './phi.service';
import {
  maskPhone,
  PhoneMaskOptions,
  maskEmail2,
  EmailMask2Options,
  maskString,
  StringMaskOptions,
} from 'maskdata';

describe('PhiService', () => {
  let service: PhiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhiService, GqlService, ConfigService],
    }).compile();

    service = module.get<PhiService>(PhiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should mask email', () => {
    // Given
    const email = 'test@test.com';

    // When
    const maskedData = maskEmail2(email);

    // Then
    expect(maskedData).toEqual('tes*@******om');
  });

  it('should mask phone numeber', () => {
    // Given
    const pno = '1234567890';

    // When
    const maskedData = maskPhone(pno);

    // Then
    expect(maskedData).toEqual('1234*****0');
  });

  it('should mask other strings', () => {
    // Given
    const strings = ['Batman', 'Spiderman', 'Hulk'];
    const maskStringOptions: StringMaskOptions = {
      maskWith: '*',
      values: ['Batman', 'Hu'],
    };

    // When
    const maskedStrings = [];
    strings.forEach((str) => {
      maskedStrings.push(maskString(str, maskStringOptions));
    });

    // Then
    expect(maskedStrings).toEqual(['******', 'Spiderman', '**lk']);
  });

  it('[custom implementation] should mask string', () => {
    // Given
    const strings = ['Batman', 'Spiderman', 'Hulk', 'ABC', 'AB', 'A'];

    // When
    const maskedStrings = [];
    strings.forEach((str) => {
      maskedStrings.push(service.maskString(str));
    });

    // Then
    expect(maskedStrings).toEqual(['B****n', 'Sp*****an', 'H**k', '***', '**', '*']);
  });
});
