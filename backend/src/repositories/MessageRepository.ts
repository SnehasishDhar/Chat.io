import { Message, IMessage } from "../models/Message";
import { Types } from "mongoose";

export class MessageRepository {
  async findByConversation(conversationId: string): Promise<IMessage[]> {
    return Message.find({ conversationId: new Types.ObjectId(conversationId) }).sort({ timestamp: 1 });
  }

  async create(msgData: Partial<IMessage>): Promise<IMessage> {
    const message = new Message(msgData);
    return message.save();
  }

  async deleteByConversation(conversationId: string): Promise<any> {
    return Message.deleteMany({ conversationId: new Types.ObjectId(conversationId) });
  }
}

export const messageRepository = new MessageRepository();
