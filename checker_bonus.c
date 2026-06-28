/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   checker_bonus.c                                    :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: aeldiran <aeldiran@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/01/02 21:45:39 by aeldiran          #+#    #+#             */
/*   Updated: 2026/04/13 16:16:40 by aeldiran         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

#include "push_swap_bonus.h"

static void	read_and_execute(t_data *data)
{
	char	*line;

	while (1)
	{
		line = checker_get_line(0);
		if (!line)
			break ;
		if (line[0] == '\0')
		{
			free(line);
			error_exit(data);
		}
		if (!checker_execute(data, line))
		{
			free(line);
			error_exit(data);
		}
		free(line);
	}
}

int	main(int ac, char **av)
{
	t_data	data;

	if (ac < 2)
		return (0);
	parse_arguments(ac, av, &data);
	read_and_execute(&data);
	if (is_sorted(data.a) && !data.b)
		ft_putstr_fd("OK\n", 1);
	else
		ft_putstr_fd("KO\n", 1);
	stack_clear(&data.a);
	stack_clear(&data.b);
	return (0);
}
