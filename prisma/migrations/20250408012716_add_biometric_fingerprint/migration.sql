/*
  Warnings:

  - A unique constraint covering the columns `[biometricKeyFingerprint]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "biometricKeyFingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_biometricKeyFingerprint_key" ON "User"("biometricKeyFingerprint");
