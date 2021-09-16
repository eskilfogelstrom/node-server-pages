const fs = require('fs');
const path = require('path');
const http = require('http');

const lexer = input => {
  let head = 0;
  const blocks = [];
  let block = '';
  while (head < input.length) {
    if (input.slice(head, head + 5) === '<?nsp') {
      head += 5;
      blocks.push({ type: 'html', val: block });
      block = '';
      while (head < input.length) {
        if (input.slice(head, head + 2) === '?>') {
          blocks.push({ type: 'js', val: block });
          block = '';
          head += 2;
          break;
        } else {
          block += input[head];
          head++;
        }
      }
    }
    if (input.slice(head, head + 2) === '{{') {
      blocks.push({ type: 'html', val: block });
      head += 2;
      block = '';
      while (head < input.length) {
        if (input.slice(head, head + 2) === '}}') {
          blocks.push({ type: 'expr', val: block });
          block = '';
          head += 2;
          break;
        } else {
          block += input[head];
          head++;
        }
      }
    }
    block += input[head];
    head++;
    if (head === input.length) {
      blocks.push({ type: 'html', val: block });
    }
  }
  return blocks;
};

const parser = input => {
  let tree = '';
  input.forEach(block => {
    if (block.type === 'html') {
      tree += 'print(`' + block.val.replace(/`/g, '\\`') + '`);';
    } else if (block.type === 'expr') {
      tree += 'print(' + block.val + ');';
    } else {
      tree += block.val;
    }
  });
  return tree;
};

const run = tree => {
  let output = '';
  const print = str => {
    output += str;
  };
  eval(tree);

  return output;
};

const handler = (req, res) => {
  const file = path.join(__dirname, req.url);
  fs.access(file, err => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    fs.readFile(file, 'utf-8', (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal server error');
        return;
      }
      const blocks = lexer(data);
      const tree = parser(blocks);
      const html = run(tree);

      res.writeHead(200);
      res.end(html);
    });
  });
};

const server = http.createServer(handler);
server.listen('8080');
