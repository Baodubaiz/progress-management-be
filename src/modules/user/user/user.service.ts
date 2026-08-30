import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/app-error';
import { hashPassword, comparePassword } from '../../../utils/hash.util';
import { removeLocalFile } from '../../../middlewares/upload.middleware';
import {
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  GetUsersQueryInput,
} from './user.validation';

export class UserService {
  /**
   * Create a new user
   */
  async createUser(data: CreateUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const hashedPassword = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash: hashedPassword,
        avatarUrl: data.avatarUrl,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Get all users with pagination and search
   */
  async getUsers(query: GetUsersQueryInput) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (query.search) {
      whereClause.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * Update user details
   */
  async updateUser(id: string, data: UpdateUserInput) {
    const existingUser = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingUser) {
      throw new AppError('User not found', 404);
    }

    // If new avatar is provided, delete the previous local avatar
    if (data.avatarUrl && existingUser.avatarUrl && data.avatarUrl !== existingUser.avatarUrl) {
      removeLocalFile(existingUser.avatarUrl);
    }

    const updatedUser = await prisma.user.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.username !== undefined && { username: data.username }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Change user password
   */
  async changePassword(id: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 400);
    }

    const newHashedPassword = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: BigInt(id) },
      data: {
        passwordHash: newHashedPassword,
      },
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * Delete user
   */
  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(id) },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Delete associated avatar file from disk
    if (user.avatarUrl) {
      removeLocalFile(user.avatarUrl);
    }

    await prisma.user.delete({
      where: { id: BigInt(id) },
    });

    return { message: 'User deleted successfully' };
  }
}

export const userService = new UserService();

