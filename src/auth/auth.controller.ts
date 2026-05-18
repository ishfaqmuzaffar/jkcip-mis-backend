import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';   // ← add this import

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Add @Public() above login and register:
  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) { ... }

  @Public()
  @Post('register')
  register(@Body() registerDto: RegisterDto) { ... }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.authService.me(req.user.userId);
  }
}