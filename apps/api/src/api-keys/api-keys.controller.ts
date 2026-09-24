import { Controller, Post, Body } from "@nestjs/common";
import { ApiKeysService } from "./api-keys.service.ts";

@Controller("internal/api-keys")
export class ApiKeysController {
  constructor(private svc: ApiKeysService) {}

  @Post("resolve")
  async resolve(@Body("key") key: string) {
    const result = await this.svc.resolve(key);
    if (!result) return { valid: false };
    return { valid: true, orgId: result.orgId };
  }
}
