import jwt from 'jsonwebtoken';

export const generateSubrequestToken = (body: string, secret: string): string => {
  const token = jwt.sign({ request: JSON.stringify(body) }, secret, { expiresIn: '5min' })
  return token
}

export const verifySubrequestToken = (token: string, body: string, secret: string): boolean => {
  const decoded = jwt.verify(token, secret)
  if (typeof decoded === 'string') { 
    return false
  }

  return decoded.request === JSON.stringify(body)
}