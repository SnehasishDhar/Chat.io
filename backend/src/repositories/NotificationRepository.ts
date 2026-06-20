import { Notification, INotification } from "../models/Notification";
import { Types } from "mongoose";

export class NotificationRepository {
  async findByUser(userId: string): Promise<INotification[]> {
    return Notification.find({
      $or: [{ userId: new Types.ObjectId(userId) }, { userId: { $exists: false } }, { userId: null }],
    }).sort({ createdAt: -1 });
  }

  async findUnreadByUser(userId: string): Promise<INotification[]> {
    return Notification.find({
      $or: [{ userId: new Types.ObjectId(userId) }, { userId: { $exists: false } }, { userId: null }],
      read: false,
    }).sort({ createdAt: -1 });
  }

  async create(notifData: Partial<INotification>): Promise<INotification> {
    const notification = new Notification(notifData);
    return notification.save();
  }

  async markAsRead(id: string): Promise<INotification | null> {
    return Notification.findByIdAndUpdate(id, { $set: { read: true } }, { new: true });
  }

  async markAllReadByUser(userId: string): Promise<any> {
    return Notification.updateMany(
      {
        $or: [{ userId: new Types.ObjectId(userId) }, { userId: { $exists: false } }, { userId: null }],
        read: false,
      },
      { $set: { read: true } }
    );
  }
}

export const notificationRepository = new NotificationRepository();
