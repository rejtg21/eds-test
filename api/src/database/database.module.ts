import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

/**
 * Global so every feature module (and the standalone worker contexts) can
 * inject the default DataSource without re-importing anything.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forRoot(buildTypeOrmOptions())],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
