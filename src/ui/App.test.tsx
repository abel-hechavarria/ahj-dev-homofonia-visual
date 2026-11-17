import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

function startTxtImport(name: string) {
  let finishRead!: (text: string) => void;
  const pendingText = new Promise<string>((resolve) => {
    finishRead = resolve;
  });
  const file = new File([], name, { type: 'text/plain' });
  Object.defineProperty(file, 'text', { value: () => pendingText });
  fireEvent.change(screen.getByLabelText('Subir TXT'), { target: { files: [file] } });

  return async (text: string) => {
    await act(async () => finishRead(text));
  };
}

describe('App', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    URL.createObjectURL = vi.fn(() => 'blob:homofonia');
    URL.revokeObjectURL = vi.fn();
  });

  it('transforms pasted text automatically', () => {
    render(<App />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Texto original' }), {
      target: { value: 'No sé decirte' },
    });

    expect(screen.getByText('zé')).toBeInTheDocument();
    expect(screen.getByText('desirte')).toBeInTheDocument();
  });

  it('loads a txt file', async () => {
    render(<App />);

    const file = new File(['Tu voz'], 'sample.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Subir TXT'), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText('bos')).toBeInTheDocument();
    });
  });

  it('keeps edits made while a TXT file is loading', async () => {
    render(<App />);
    const finishRead = startTxtImport('older.txt');
    const editor = screen.getByRole('textbox', { name: 'Texto original' });

    fireEvent.change(editor, { target: { value: 'Mi casa' } });
    await finishRead('Texto anterior');

    expect(editor).toHaveValue('Mi casa');
    expect(screen.getByLabelText('Texto transformado')).toHaveTextContent('Mi kaza');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copiar/i }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Mi kaza');
  });

  it.each(['older', 'newer'] as const)(
    'uses the last selected TXT when the %s file finishes first',
    async (first) => {
      render(<App />);
      const editor = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Texto original' });
      const initialText = editor.value;
      const finishOlder = startTxtImport('older.txt');
      const finishNewer = startTxtImport('newer.txt');

      if (first === 'older') {
        await finishOlder('Texto anterior');
        expect(editor).toHaveValue(initialText);
        await finishNewer('Tu voz');
      } else {
        await finishNewer('Tu voz');
        await finishOlder('Texto anterior');
      }

      expect(editor).toHaveValue('Tu voz');
      expect(screen.getByLabelText('Texto transformado')).toHaveTextContent('Tu bos');
    },
  );

  it('allows manual replacement review', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /manual/i }));

    const select = screen.getByDisplayValue('zé');
    fireEvent.change(select, { target: { value: '__original__' } });

    expect(screen.getByLabelText('Texto transformado')).toHaveTextContent(
      'No sé desirte',
    );
  });

  it('copies output', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /copiar/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'No zé desirte\nKómo fue\nNi eksplikarme ké pazó',
      );
    });
  });

  it('starts a txt download', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Descargar TXT' }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
