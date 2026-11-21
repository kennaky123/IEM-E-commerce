import { IPresetRepository } from '../interfaces/repositories';
import { PresetBuildModel } from '../models/PresetBuild';
import { PresetBuildDefinition } from '../types';
import { BaseMongoRepository } from './BaseMongoRepository';

export class MongoPresetRepository
  extends BaseMongoRepository<PresetBuildDefinition>
  implements IPresetRepository
{
  async findAll(): Promise<PresetBuildDefinition[]> {
    const docs = await PresetBuildModel.find({}).lean();
    return this.stripDocs<PresetBuildDefinition>(docs);
  }

  async count(): Promise<number> {
    return PresetBuildModel.countDocuments();
  }
}
