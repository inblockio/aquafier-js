/*
  Warnings:

  - Added the required column `subtitle` to the `aqua_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "aqua_templates" ADD COLUMN     "subtitle" TEXT NOT NULL;
