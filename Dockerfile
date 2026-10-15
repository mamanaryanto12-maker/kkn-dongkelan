# Image Node.js ramping. Node 24 sudah mengaktifkan modul bawaan "node:sqlite"
# tanpa flag, sehingga proyek ini tidak butuh dependensi native tambahan.
FROM node:24-slim

ENV NODE_ENV=production

WORKDIR /app

# Pasang dependensi lebih dulu agar lapisan cache efisien.
COPY package*.json ./
RUN npm ci --omit=dev

# Salin sisa kode proyek.
COPY . .

# Siapkan folder data & unggahan (ditimpa oleh disk permanen saat runtime).
RUN mkdir -p data public/uploads

EXPOSE 3000

CMD ["node", "server.js"]
