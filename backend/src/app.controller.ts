import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
    @Get()
    getRoot() {
        return { message: 'Mizara API is running' };
    }
}
