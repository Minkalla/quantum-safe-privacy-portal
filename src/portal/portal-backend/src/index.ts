const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello from Quantum-Safe Privacy Portal Backend!');
});

app.listen(port, () => {
  console.log(`Portal Backend listening at http://localhost:${port}`);
});