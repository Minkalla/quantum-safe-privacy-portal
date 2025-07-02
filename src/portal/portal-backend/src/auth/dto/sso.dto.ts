import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SSOLoginDto {
  @ApiPropertyOptional({
    description: 'Optional relay state to maintain application context during SSO flow',
    example: '/dashboard',
  })
  @IsOptional()
  @IsString()
    relayState?: string;

  @ApiPropertyOptional({
    description: 'Optional target URL to redirect after successful authentication',
    example: 'https://app.example.com/dashboard',
  })
  @IsOptional()
  @IsUrl()
    targetUrl?: string;
}

export class SAMLResponseDto {
  @ApiProperty({
    description: 'Base64-encoded SAML response from Identity Provider',
    example: 'PHNhbWxwOlJlc3BvbnNlIHhtbG5zOnNhbWxwPSJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wiLi4u',
  })
  @IsString()
    SAMLResponse: string;

  @ApiPropertyOptional({
    description: 'Optional relay state returned from Identity Provider',
    example: '/dashboard',
  })
  @IsOptional()
  @IsString()
    RelayState?: string;
}

export class SSOMetadataDto {
  @ApiProperty({
    description: 'Service Provider metadata in XML format',
    example: '<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata">...</md:EntityDescriptor>',
  })
    metadata: string;
}
