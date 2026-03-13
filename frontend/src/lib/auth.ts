import { SignJWT, jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || 'SuperSecretKeyForSIPProApplicationDevelopmentVerifyChangeInProd!'
const key = new TextEncoder().encode(secretKey)

export async function signToken(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('SIPPro')
        .setAudience('SIPProUser')
        .setExpirationTime('1d')
        .sign(key)
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, key, {
            issuer: 'SIPPro',
            audience: 'SIPProUser',
        })
        return payload
    } catch (error) {
        return null
    }
}
