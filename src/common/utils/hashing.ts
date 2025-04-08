import { hash, compare } from 'bcryptjs';

export async function hashField(field: string): Promise<string> {
  const saltRounds = 10;
  return await hash(field, saltRounds);
}

export async function compareHashedField(
  plainField: string,
  hashedField: string,
): Promise<boolean> {
  return await compare(plainField, hashedField);
}
