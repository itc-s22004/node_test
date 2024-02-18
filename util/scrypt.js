const crypto = require("node:crypto");

/** 計算コスト。OWASP推奨値 */
const N = Math.pow(2, 17);
/** 最大メモリサイズ */
const maxmem = 144 * 1024 * 1024;   // 144 MiB
/** パスワードハッシュの長さ */
const keyLen = 192;
/** ハッシュソルトの長さ */
const saltSize = 64;

/**
 * ソルト用にランダムなバイト列生成
 * @return {Buffer}
 */
const generateSalt = () => crypto.randomBytes(saltSize);

/**
 * 文字列 plain から Scrypt によるハッシュ値を計算
 * @param {String} plain
 * @param {Buffer} salt
 * @return {Buffer}
 */
const calcHash = (plain, salt) => {
    const normalized = plain.normalize();
    const hash = crypto.scryptSync(normalized, salt, keyLen, {N, maxmem});
    if (!hash) {
        throw Error("なんかエラー");
    }
    return hash;
};

module.exports = {generateSalt, calcHash};