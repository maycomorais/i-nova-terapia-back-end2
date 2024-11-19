// src/common/repositories/base.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface IBaseRepository<T> {
  findOne(id: number, tenantId: string): Promise<T | null>;
  findAll(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    tenantId: string;
  }): Promise<T[]>;
  create(data: any, tenantId: string): Promise<T>;
  update(id: number, data: any, tenantId: string): Promise<T>;
  delete(id: number, tenantId: string): Promise<T>;
}

@Injectable()
export abstract class BaseRepository<T> implements IBaseRepository<T> {
  protected prisma: PrismaService;
  constructor(
    prismaService: PrismaService,
    protected readonly modelName: string,
  ) {
    this.prisma = prismaService;
  }

  async findOne(id: number, tenantId: string): Promise<T | null> {
    return this.prisma[this.modelName].findFirst({
      where: {
        id,
        tenantId,
      },
    }) as Promise<T>;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    tenantId: string;
  }): Promise<T[]> {
    return this.prisma[this.modelName].findMany({
      skip: params.skip,
      take: params.take,
      where: {
        ...params.where,
        tenantId: params.tenantId,
      },
      orderBy: params.orderBy,
    }) as Promise<T[]>;
  }

  async create(data: any, tenantId: string): Promise<T> {
    return this.prisma[this.modelName].create({
      data: {
        ...data,
        tenantId,
      },
    }) as Promise<T>;
  }

  async update(id: number, data: any, tenantId: string): Promise<T> {
    return this.prisma[this.modelName].update({
      where: {
        id,
        tenantId,
      },
      data,
    }) as Promise<T>;
  }

  async delete(id: number, tenantId: string): Promise<T> {
    return this.prisma[this.modelName].delete({
      where: {
        id,
        tenantId,
      },
    }) as Promise<T>;
  }
}
