/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   parsing_bonus.c                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 21:48:07 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:17:03 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap_bonus.h"

/* Add a validated number to stack A. */
static void	add_to_stack(t_data *data, char *str)
{
	long	num;
	t_stack	*new;

	if (!str || str[0] == '\0')
		error_exit(data);
	if (!is_valid_number(str))
		error_exit(data);
	num = ft_atoi(str);
	if (num > INT_MAX || num < INT_MIN)
		error_exit(data);
	new = stack_new((int)num);
	if (!new)
		error_exit(data);
	stack_add_back(&data->a, new);
}

/* Parse arguments from a single string. */
static void	parse_string(t_data *data, char *str)
{
	char	**numbers;
	int		i;

	if (!str || str[0] == '\0')
		error_exit(data);
	numbers = ft_split(str, ' ');
	if (!numbers || !numbers[0])
	{
		if (numbers)
			free_split(numbers);
		error_exit(data);
	}
	i = 0;
	while (numbers[i])
	{
		add_to_stack(data, numbers[i]);
		i++;
	}
	free_split(numbers);
}

/* Parse argv into stack A. */
void	parse_arguments(int ac, char **av, t_data *data)
{
	int	i;

	data->a = NULL;
	data->b = NULL;
	data->size = 0;
	if (ac == 2)
		parse_string(data, av[1]);
	else
	{
		i = 1;
		while (i < ac)
		{
			add_to_stack(data, av[i]);
			i++;
		}
	}
	data->size = stack_size(data->a);
	if (data->size == 0)
		error_exit(data);
	if (has_duplicates(data->a))
		error_exit(data);
	assign_index(data->a, data->size);
}
