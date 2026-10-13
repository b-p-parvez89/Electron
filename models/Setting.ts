import { Schema, models, model } from "mongoose";
const SettingSchema = new Schema({
  key: { type: String, default: "main", unique: true },
  data: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });
export default models.Setting || model("Setting", SettingSchema);
