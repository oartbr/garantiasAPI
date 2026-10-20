const major = Number(process.versions.node.split('.')[0]);

if (major !== 24) {
  console.error(
    `Esta API exige Node 24.x; o terminal esta usando ${process.version}.\n` +
      'Com NVM: nvm install 24.22.0 && nvm use 24.22.0\n' +
      'Confirme com node --version e execute npm run dev novamente.'
  );
  process.exit(1);
}
