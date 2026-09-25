import { Controller, Get, Post, Body, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.ts";
import { OrgsService } from "./orgs.service.ts";

@Controller("orgs")
@UseGuards(AuthGuard)
export class OrgsController {
  constructor(private orgs: OrgsService) {}

  @Get()
  list(@Req() req: any) {
    return this.orgs.listForUser(req.userId);
  }

  @Post()
  create(@Req() req: any, @Body() body: { name: string; slug: string }) {
    return this.orgs.create(req.userId, body.name, body.slug);
  }
}
