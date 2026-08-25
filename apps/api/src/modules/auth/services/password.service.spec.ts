import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('hash', () => {
    it('should return a hash that is not the original password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same password (randomized salt)', async () => {
      const password = 'TestPassword123!';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should return true for a valid password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      const result = await service.verify(hash, password);

      expect(result).toBe(true);
    });

    it('should return false for an invalid password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await service.hash(password);

      const result = await service.verify(hash, wrongPassword);

      expect(result).toBe(false);
    });
  });

  describe('validatePasswordPolicy', () => {
    it('should accept a valid password', () => {
      const result = service.validatePasswordPolicy('TestPassword123!');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject a password shorter than 8 characters', () => {
      const result = service.validatePasswordPolicy('Short1!');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('should accept a password of exactly 8 characters', () => {
      const result = service.validatePasswordPolicy('Abcdef12');

      expect(result.valid).toBe(true);
    });

    it('should reject a password longer than 128 characters', () => {
      const longPassword = 'a'.repeat(129);
      const result = service.validatePasswordPolicy(longPassword);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must not exceed 128 characters');
    });

    it('should accept a password of exactly 128 characters', () => {
      const longPassword = 'A1' + 'a'.repeat(126);
      const result = service.validatePasswordPolicy(longPassword);

      expect(result.valid).toBe(true);
    });

    it('should accept a passphrase', () => {
      const passphrase = 'Correct horse battery staple 1';
      const result = service.validatePasswordPolicy(passphrase);

      expect(result.valid).toBe(true);
    });

    it('should reject non-string input', () => {
      const result = service.validatePasswordPolicy(123 as unknown as string);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Password must be a string');
    });
  });
});
