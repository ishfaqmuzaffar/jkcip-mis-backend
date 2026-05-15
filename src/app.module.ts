import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SchemesModule } from './schemes/schemes.module';
import { ProjectsModule } from './projects/projects.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { RolesGuard } from './common/roles.guard';
import { LogframeModule } from './logframe/logframe.module';
import { ComponentModule } from './component/component.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard'; // ← NEW

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    DashboardModule,
    SchemesModule,
    ProjectsModule,
    BeneficiariesModule,
    ApprovalsModule,
    LogframeModule,
    ComponentModule,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // ← NEW: runs first, sets request.user
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,   // ← runs second, request.user is now set
    },
  ],
})
export class AppModule {}