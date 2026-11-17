import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

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
