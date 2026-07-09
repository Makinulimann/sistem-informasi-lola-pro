import { SignJWT, jwtVerify } from 'jose'

function getSecretKey() {
    const secretKey = process.env.JWT_SECRET;
    if (!secretKey) {
        throw new Error('JWT_SECRET environment variable is missing/not configured.');
    }
    return new TextEncoder().encode(secretKey);
}

export async function signToken(payload: any) {
    const key = getSecretKey();
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
        const key = getSecretKey();
        const { payload } = await jwtVerify(token, key, {
            issuer: 'SIPPro',
            audience: 'SIPProUser',
        })
        return payload
    } catch (error) {
        return null;
    }
}

export async function signResetToken(payload: any) {
    const key = getSecretKey();
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer('SIPPro')
        .setAudience('SIPProReset')
        .setExpirationTime('1h')
        .sign(key)
}

export async function verifyResetToken(token: string) {
    try {
        const key = getSecretKey();
        const { payload } = await jwtVerify(token, key, {
            issuer: 'SIPPro',
            audience: 'SIPProReset',
        })
        return payload
    } catch (error) {
        return null;
    }
}

