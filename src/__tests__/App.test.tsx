import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as taskApi from '../api/taskApi';
import type { Task } from '../types/task';

vi.mock('../api/taskApi');

const mockTasks: Task[] = [
	{
		id: 1,
		title: 'Première tâche',
		description: 'Description 1',
		completed: false,
		createdAt: '2026-01-15T10:00:00Z',
		updatedAt: '2026-01-15T10:00:00Z',
	},
	{
		id: 2,
		title: 'Deuxième tâche',
		description: null,
		completed: true,
		createdAt: '2026-01-16T10:00:00Z',
		updatedAt: '2026-01-16T10:00:00Z',
	},
];

beforeEach(() => {
	vi.resetAllMocks();
});

describe('App', () => {
	it('renders the header title', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([]);
		render(<App />);
		expect(screen.getByText('Mes Tâches')).toBeInTheDocument();
		await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());
	});

	it('shows loading state while tasks are being fetched', () => {
		vi.mocked(taskApi.getTasks).mockReturnValue(new Promise(() => {}));
		render(<App />);
		expect(screen.getByTestId('loading')).toBeInTheDocument();
	});

	it('shows empty state when there are no tasks', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([]);
		render(<App />);
		await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());
	});

	it('shows error state when loading tasks fails', async () => {
		vi.mocked(taskApi.getTasks).mockRejectedValue(new Error('Network error'));
		render(<App />);
		await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
		expect(screen.getByText(/Network error/)).toBeInTheDocument();
	});

	it('does not show header stats when there are no tasks', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([]);
		render(<App />);
		await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());
		expect(screen.queryByText('Total')).not.toBeInTheDocument();
	});

	it('shows header stats reflecting total, completed and pending counts', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue(mockTasks);
		render(<App />);
		await waitFor(() => expect(screen.getByTestId('task-list')).toBeInTheDocument());

		expect(screen.getByText('Total')).toBeInTheDocument();
		expect(screen.getByText('Terminées')).toBeInTheDocument();
		expect(screen.getByText('En cours')).toBeInTheDocument();

		const stats = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
		expect(stats).toEqual(['2', '1', '1']);
	});

	it('adds a new task via the form and updates the list and stats', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([]);
		const newTask: Task = {
			id: 3,
			title: 'Nouvelle tâche',
			description: undefined as unknown as string | null,
			completed: false,
			createdAt: '2026-01-17T10:00:00Z',
			updatedAt: '2026-01-17T10:00:00Z',
		};
		vi.mocked(taskApi.createTask).mockResolvedValue(newTask);

		render(<App />);
		await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());

		fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Nouvelle tâche' } });
		fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }));

		await waitFor(() => expect(screen.getByText('Nouvelle tâche')).toBeInTheDocument());
		expect(taskApi.createTask).toHaveBeenCalledWith({ title: 'Nouvelle tâche', description: undefined });
		expect(screen.getByText('1 tâche')).toBeInTheDocument();
	});

	it('toggling a task updates the completed/pending stats', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue([mockTasks[0]]);
		vi.mocked(taskApi.updateTask).mockResolvedValue({ ...mockTasks[0], completed: true });

		render(<App />);
		await waitFor(() => expect(screen.getByTestId('task-list')).toBeInTheDocument());

		fireEvent.click(screen.getByRole('checkbox'));

		await waitFor(() => {
			const stats = screen.getAllByText(/^\d+$/).map((el) => el.textContent);
			expect(stats).toEqual(['1', '1', '0']);
		});
		expect(taskApi.updateTask).toHaveBeenCalledWith(1, { completed: true });
	});

	it('deleting a task removes it from the list', async () => {
		vi.mocked(taskApi.getTasks).mockResolvedValue(mockTasks);
		vi.mocked(taskApi.deleteTask).mockResolvedValue(undefined);

		render(<App />);
		await waitFor(() => expect(screen.getByTestId('task-list')).toBeInTheDocument());

		const deleteButtons = screen.getAllByLabelText('Supprimer');
		fireEvent.click(deleteButtons[0]);
		fireEvent.click(deleteButtons[0]);

		await waitFor(() => expect(screen.queryByText('Première tâche')).not.toBeInTheDocument());
		expect(taskApi.deleteTask).toHaveBeenCalledWith(1);
		expect(screen.getByText('1 tâche')).toBeInTheDocument();
	});
});
