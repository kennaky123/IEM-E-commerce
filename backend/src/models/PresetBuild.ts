import mongoose, { Schema } from 'mongoose';
import { PresetBuildDefinition } from '../types';

/** Mongoose schema for curated audiophile signal chain presets stored in MongoDB. */
const PresetBuildSchema = new Schema<PresetBuildDefinition>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    tagline: { type: String, required: true },
    targetProfile: { type: String, required: true },
    synergyHint: { type: String, required: true },
    slots: { type: Schema.Types.Mixed, default: {} },
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret._id;
        return ret;
      },
    },
  }
);

export const PresetBuildModel =
  mongoose.models.PresetBuild ||
  mongoose.model<PresetBuildDefinition>('PresetBuild', PresetBuildSchema);
