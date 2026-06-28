/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   main.c                                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 20:14:47 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:52 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap.h"

/* Choose appropriate sorting algorithm based on size */
static void	sort_stack(t_data *data)
{
	if (data->size == 2)
		sort_two(data);
	else if (data->size == 3)
		sort_three(data);
	else if (data->size == 4)
		sort_four(data);
	else if (data->size == 5)
		sort_five(data);
	else
		butterfly_sort(data);
}

int	main(int ac, char **av)
{
	t_data	data;

	if (ac < 2)
		return (0);
	parse_arguments(ac, av, &data);
	if (is_sorted(data.a))
	{
		stack_clear(&data.a);
		return (0);
	}
	sort_stack(&data);
	stack_clear(&data.a);
	stack_clear(&data.b);
	return (0);
}
