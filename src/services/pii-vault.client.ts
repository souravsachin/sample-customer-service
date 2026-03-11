import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * HTTP client for the zorbit-pii-vault service.
 *
 * Raw PII (email, phone, etc.) must be tokenized before storage.
 * Operational databases only store PII tokens (e.g. PII-92AF).
 * Detokenization requires the pii:detokenize privilege.
 */
@Injectable()
export class PiiVaultClient {
  private readonly logger = new Logger(PiiVaultClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseURL = this.configService.get<string>('PII_VAULT_URL', 'http://localhost:3005');
    this.httpClient = axios.create({
      baseURL,
      timeout: 5000,
    });
  }

  /**
   * Tokenize a PII value.
   * @param dataType - Type of PII data (e.g. 'email', 'phone')
   * @param value - Raw PII value to tokenize
   * @returns PII token (e.g. 'PII-92AF')
   */
  async tokenize(dataType: string, value: string): Promise<string> {
    try {
      const response = await this.httpClient.post('/api/v1/G/pii/tokenize', {
        dataType,
        value,
      });
      return response.data.token;
    } catch (error) {
      this.logger.error(`Failed to tokenize ${dataType}`, error);
      throw error;
    }
  }

  /**
   * Detokenize a PII token back to the raw value.
   * @param token - PII token (e.g. 'PII-92AF')
   * @returns Raw PII value
   */
  async detokenize(token: string): Promise<string> {
    try {
      const response = await this.httpClient.post('/api/v1/G/pii/detokenize', {
        token,
      });
      return response.data.value;
    } catch (error) {
      this.logger.error(`Failed to detokenize token ${token}`, error);
      throw error;
    }
  }
}
