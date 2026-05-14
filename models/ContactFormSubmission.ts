import mongoose from "mongoose";

const ContactFormSubmissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 200, trim: true },
    email: { type: String, required: true, maxlength: 320, trim: true },
    subject: { type: String, default: "", maxlength: 400, trim: true },
    message: { type: String, required: true, maxlength: 20000, trim: true },
  },
  { timestamps: true }
);

ContactFormSubmissionSchema.index({ createdAt: -1 });

if (mongoose.models.ContactFormSubmission) {
  delete mongoose.models.ContactFormSubmission;
}

export default mongoose.model(
  "ContactFormSubmission",
  ContactFormSubmissionSchema
);
