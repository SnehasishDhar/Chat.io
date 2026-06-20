import { User, IUser } from "../models/User";

export class UserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return User.findById(id);
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    return user.save();
  }

  async update(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: updateData }, { new: true });
  }
}

export const userRepository = new UserRepository();
