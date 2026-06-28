/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   butterfly_utils.c                                  :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 20:12:33 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:37 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap.h"

/* Choose a chunk size for butterfly sort. */
int	get_chunk_size(int total_size)
{
	if (total_size <= 10)
		return (2);
	if (total_size <= 100)
		return (15);
	if (total_size <= 500)
		return (32);
	return (45);
}

/* Find the position of an index in the stack. */
int	get_position(t_stack *stack, int target_index)
{
	int	pos;

	pos = 0;
	while (stack)
	{
		if (stack->index == target_index)
			return (pos);
		pos++;
		stack = stack->next;
	}
	return (-1);
}

/* Find the biggest index in the stack. */
int	find_max_index(t_stack *stack)
{
	int	max;

	if (!stack)
		return (-1);
	max = stack->index;
	while (stack)
	{
		if (stack->index > max)
			max = stack->index;
		stack = stack->next;
	}
	return (max);
}
